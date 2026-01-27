#!/bin/bash

# XBoard Frontend - Start with Correct Ports
# User Frontend: http://localhost:5173
# Admin Backend: http://localhost:5174

set -e

echo "=========================================="
echo "XBoard Frontend - Starting Services"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from xboard-frontend directory${NC}"
    exit 1
fi

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    echo -e "${YELLOW}Checking port $port...${NC}"
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Kill any existing processes on ports 5173 and 5174
echo -e "${BLUE}Step 1: Cleaning up existing processes...${NC}"
kill_port 5173
kill_port 5174
echo ""

# Verify ports are free
echo -e "${BLUE}Step 2: Verifying ports are free...${NC}"
if lsof -i:5173 >/dev/null 2>&1; then
    echo -e "${RED}Error: Port 5173 is still in use${NC}"
    exit 1
fi
if lsof -i:5174 >/dev/null 2>&1; then
    echo -e "${RED}Error: Port 5174 is still in use${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Ports 5173 and 5174 are free${NC}"
echo ""

# Check if node_modules exists
echo -e "${BLUE}Step 3: Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pnpm install
fi
echo -e "${GREEN}✓ Dependencies ready${NC}"
echo ""

# Start services
echo -e "${BLUE}Step 4: Starting services...${NC}"
echo ""

# Start user frontend in background
echo -e "${GREEN}Starting User Frontend on port 5173...${NC}"
pnpm dev:user > /tmp/xboard-user.log 2>&1 &
USER_PID=$!
echo "User Frontend PID: $USER_PID"
sleep 3

# Start admin backend in background
echo -e "${GREEN}Starting Admin Backend on port 5174...${NC}"
pnpm dev:admin > /tmp/xboard-admin.log 2>&1 &
ADMIN_PID=$!
echo "Admin Backend PID: $ADMIN_PID"
sleep 3

echo ""
echo "=========================================="
echo -e "${GREEN}Services Started Successfully!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}User Frontend:${NC}  http://localhost:5173"
echo -e "${BLUE}Admin Backend:${NC}  http://localhost:5174"
echo ""
echo -e "${YELLOW}Process IDs:${NC}"
echo "  User:  $USER_PID"
echo "  Admin: $ADMIN_PID"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo "  User:  tail -f /tmp/xboard-user.log"
echo "  Admin: tail -f /tmp/xboard-admin.log"
echo ""
echo -e "${YELLOW}To stop services:${NC}"
echo "  kill $USER_PID $ADMIN_PID"
echo ""

# Wait a bit and verify services are running
sleep 2
if ! ps -p $USER_PID > /dev/null; then
    echo -e "${RED}Error: User frontend failed to start. Check logs: tail -f /tmp/xboard-user.log${NC}"
    exit 1
fi
if ! ps -p $ADMIN_PID > /dev/null; then
    echo -e "${RED}Error: Admin backend failed to start. Check logs: tail -f /tmp/xboard-admin.log${NC}"
    exit 1
fi

# Verify ports are listening
sleep 2
if ! lsof -i:5173 >/dev/null 2>&1; then
    echo -e "${RED}Error: User frontend not listening on port 5173${NC}"
    exit 1
fi
if ! lsof -i:5174 >/dev/null 2>&1; then
    echo -e "${RED}Error: Admin backend not listening on port 5174${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All services verified and running${NC}"
echo ""
echo "Press Ctrl+C to stop all services..."
echo ""

# Keep script running and handle Ctrl+C
trap "echo ''; echo 'Stopping services...'; kill $USER_PID $ADMIN_PID 2>/dev/null; echo 'Services stopped'; exit 0" INT TERM

# Wait for both processes
wait $USER_PID $ADMIN_PID
