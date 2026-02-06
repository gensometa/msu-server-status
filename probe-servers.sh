#!/bin/bash
#
# MSU Game Server Probe Script (Bash + netcat version)
# No Node.js required
#

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_FILE="$SCRIPT_DIR/server-status.json"
TIMEOUT=3

# Check if server is online using netcat
check_server() {
    local ip=$1
    local port=$2
    nc -z -w $TIMEOUT "$ip" "$port" 2>/dev/null && echo "online" || echo "offline"
}

# Start JSON
echo "Starting probe at $(date -Iseconds)..."

# Login server (shared)
LOGIN_IP="54.64.142.213"
LOGIN_PORT=8484
LOGIN_STATUS=$(check_server $LOGIN_IP $LOGIN_PORT)
echo "Login server: $LOGIN_STATUS"

# Define channel servers for each world
# Format: "IP:PORT"
declare -A AIN_CHANNELS=(
    [1]="18.176.79.10:8585" [2]="3.112.119.155:8585" [3]="52.197.194.155:8585" [4]="35.79.26.6:8585"
    [5]="54.64.47.212:8585" [6]="54.64.47.212:8586" [7]="35.75.33.109:8585" [8]="35.75.33.109:8586"
    [9]="57.181.203.81:8585" [10]="57.181.203.81:8586" [11]="54.65.159.42:8585" [12]="54.65.159.42:8586"
    [13]="18.177.179.145:8585" [14]="18.177.179.145:8586" [15]="13.115.72.186:8585" [16]="13.115.72.186:8586"
    [17]="13.114.24.162:8585" [18]="13.114.24.162:8586" [19]="57.182.28.187:8585" [20]="57.182.28.187:8586"
)

declare -A ERRAI_CHANNELS=(
    [1]="54.64.231.217:8585" [2]="52.197.35.160:8585" [3]="13.115.216.155:8585" [4]="52.199.94.94:8585"
    [5]="13.113.142.231:8585" [6]="13.113.142.231:8586" [7]="54.238.86.190:8585" [8]="54.238.86.190:8586"
    [9]="3.112.158.137:8585" [10]="3.112.158.137:8586" [11]="13.113.22.58:8585" [12]="13.113.22.58:8586"
    [13]="52.192.76.205:8585" [14]="52.192.76.205:8586" [15]="3.115.75.51:8585" [16]="3.115.75.51:8586"
    [17]="18.182.137.148:8585" [18]="18.182.137.148:8586" [19]="35.77.174.123:8585" [20]="35.77.174.123:8586"
)

declare -A FANG_CHANNELS=(
    [1]="13.113.29.226:8585" [2]="13.113.29.226:8586" [3]="57.181.12.202:8585" [4]="57.181.12.202:8586"
    [5]="43.206.58.153:8585" [6]="43.206.58.153:8586" [7]="35.76.34.21:8585" [8]="35.76.34.21:8586"
    [9]="18.181.97.151:8585" [10]="18.181.97.151:8586" [11]="13.113.29.226:8585" [12]="54.95.68.209:8585"
    [13]="52.198.162.249:8585" [14]="3.113.107.111:8585" [15]="13.113.69.56:8585" [16]="13.115.242.3:8585"
    [17]="13.115.242.3:8586" [18]="18.180.58.239:8585" [19]="18.180.58.239:8586" [20]="18.181.50.170:8585"
)

# Function to probe a world and generate JSON
probe_world() {
    local world_id=$1
    local world_name=$2
    local world_icon=$3
    local -n channels=$4

    echo "Probing $world_name..."

    local channel_json=""
    local online_count=0

    for i in {1..20}; do
        local server="${channels[$i]}"
        local ip="${server%:*}"
        local port="${server#*:}"
        local status=$(check_server "$ip" "$port")

        [[ "$status" == "online" ]] && ((online_count++))

        [[ -n "$channel_json" ]] && channel_json+=","
        channel_json+="
        {\"id\":$i,\"status\":\"$status\"}"
    done

    echo "  Channels: $online_count/20 online"

    cat << EOF
    {
      "id": "$world_id",
      "name": "$world_name",
      "icon": "$world_icon",
      "isDisabled": false,
      "loginServer": {
        "ip": "$LOGIN_IP",
        "port": $LOGIN_PORT,
        "status": "$LOGIN_STATUS"
      },
      "channels": [$channel_json
      ]
    }
EOF
}

# Generate disabled world JSON
disabled_world() {
    local world_id=$1
    local world_name=$2
    local world_icon=$3

    local channels=""
    for i in {1..20}; do
        [[ -n "$channels" ]] && channels+=","
        channels+="
        {\"id\":$i,\"status\":\"offline\"}"
    done

    cat << EOF
    {
      "id": "$world_id",
      "name": "$world_name",
      "icon": "$world_icon",
      "isDisabled": true,
      "loginServer": {
        "ip": "0.0.0.0",
        "port": 8484,
        "status": "offline"
      },
      "channels": [$channels
      ]
    }
EOF
}

# Build the full JSON
{
    echo '{'
    echo '  "worlds": ['

    probe_world "ain" "Ain" "🌟" AIN_CHANNELS
    echo ","
    probe_world "errai" "Errai" "🔥" ERRAI_CHANNELS
    echo ","
    probe_world "fang" "Fang" "🐺" FANG_CHANNELS
    echo ","
    disabled_world "polaris" "Polaris" "⭐"
    echo ","
    disabled_world "nunki" "Nunki" "🌙"
    echo ","
    disabled_world "okab" "Okab" "🦅"

    echo '  ],'
    echo "  \"lastChecked\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\","
    echo '  "probeInterval": 60'
    echo '}'
} > "$OUTPUT_FILE"

echo ""
echo "Results written to $OUTPUT_FILE"
