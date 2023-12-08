#!/bin/sh
echo "node $(node --version)"
echo "npm v$(npm --version)"
echo "NODE_ENV=$(NODE_ENV)"

npx check-engine@latest -y

