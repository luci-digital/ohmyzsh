-- luciverse_dns.lua
-- Sovereign Web3 DNS Resolver for the .ownid TLD
-- Built for OpenResty (lua-resty-dns)
-- Prioritizing Lua, IPv6, and Zero-Trust

local resolver = require "resty.dns.resolver"
local toml = require "lua-toml" -- Need to ensure this is available or use a pre-parsed JSON map

local _M = {}

-- DNS Mapping based on the LuciVerse Agent Registry
-- In a real deployment, this would be periodically synced from luci-verse.toml
local agent_map = {
  ["lucia.orchestrator.ownid"] = "2602:f674:200:9740::1",
  ["judge.arbitrator.ownid"] = "2602:f674:200:9741::1",
  ["veritas.truth.ownid"] = "2602:f674:1:9431::1",
  ["aethon.phil.ownid"] = "2602:f674:1:9430::1",
  ["juniper.infra.ownid"] = "2602:f674:100:9521::1",
  ["cortana.comn.ownid"] = "2602:f674:100:9520::1",
  ["state.fdb.ownid"] = "2602:f674:200:9742::1"
}

function _M.resolve_name(qname, qtype)
  -- 1. Check if the query is for our sovereign TLD (.ownid)
  if string.match(qname, "%.ownid$") then
    local ipv6 = agent_map[qname]
    if ipv6 then
      ngx.log(ngx.INFO, "🔍 Resolved Sovereign ID: ", qname, " -> ", ipv6)
      return {
        { name = qname, type = resolver.TYPE_AAAA, address = ipv6, ttl = 3600 }
      }
    end
  end

  -- 2. Fallback: Quad9 — privacy-respecting, malware-blocking, DNSSEC-validating
  --    IPv6 preferred (LuciVerse is IPv6-first); IPv4 as failsafe.
  --    OpenWrt LuCI: Network → DHCP and DNS → DNS forwarders → add these four.
  --    Enable "Ignore resolv file" under Resolv and Hosts Files sub-tab.
  --    Ref: https://docs.quad9.net/Setup_Guides/Open-Source_Routers/OpenWrt_LuCi/
  local r, err = resolver:new{
    nameservers = {
      "2620:fe::fe",      -- Quad9 IPv6 primary   (filtered + DNSSEC)
      "2620:fe::9",       -- Quad9 IPv6 secondary
      "9.9.9.9",          -- Quad9 IPv4 primary   (IPv4 failsafe)
      "149.112.112.112",  -- Quad9 IPv4 secondary
    },
    retrans = 5,
    timeout = 2000,
  }

  if not r then
    ngx.log(ngx.ERR, "Failed to create upstream resolver: ", err)
    return nil, err
  end

  return r:query(qname, { qtype = qtype })
end

return _M
