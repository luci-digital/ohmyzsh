#!/bin/sh
set -e

LUA_VERSION="${LUAVERSION:-5.4}"

echo "Installing Lua ${LUA_VERSION} + LuaRocks + oasis-core dependencies..."

apt-get update -y
apt-get install -y --no-install-recommends \
    lua${LUA_VERSION} \
    lua${LUA_VERSION}-dev \
    luarocks \
    libssl-dev \
    liblua${LUA_VERSION}-dev

# lua-resty-dns is an OpenResty library — install the pure-Lua port for dev use
luarocks install lua-resty-dns 2>/dev/null || true
luarocks install lua-cjson
luarocks install luafilesystem

echo "oasis-core feature installed."
