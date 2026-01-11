#!/bin/bash

# CTFd-Style Graph Quick Setup

echo "================================================"
echo "  CTFd-Style Scoreboard Graph Setup"
echo "================================================"
echo ""

# 1. Install dependencies
echo "1. Installing Frontend Dependencies (Recharts)..."
cd frontend
npm install recharts
echo "✓ Recharts installed"
echo ""

# 2. Initialize competition
echo "2. Initializing Competition..."
cd ../backend
node scripts/initCompetition.js
echo "✓ Competition initialized"
echo ""

# 3. Restart backend
echo "3. Restarting Backend..."
pm2 restart ecosystem.config.js || npm run dev &
echo "✓ Backend restarted"
echo ""

echo "================================================"
echo "  Setup Complete!"
echo "================================================"
echo ""
echo "📊 CTFd-Style Graph Features:"
echo "  ✓ Zero-start timeline (00:00:00)"
echo "  ✓ Step-line visualization"
echo "  ✓ Proper tie-breaking"
echo "  ✓ Auto-refresh (30s)"
echo "  ✓ Top 10 teams"
echo ""
echo "🔗 API Endpoint:"
echo "  GET /api/scoreboard/graph?limit=10"
echo ""
echo "📝 Component Usage:"
echo "  import CTFdScoreboardGraph from '../components/CTFdScoreboardGraph';"
echo ""
echo "  <CTFdScoreboardGraph />"
echo ""
echo "📚 Documentation:"
echo "  See: CTFD_GRAPH_IMPLEMENTATION.md"
echo ""
echo "================================================"
