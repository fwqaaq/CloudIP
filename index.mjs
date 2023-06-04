import aws from "https://ip-ranges.amazonaws.com/ip-ranges.json" assert {type: "json"}
import google from "https://www.gstatic.com/ipranges/cloud.json" assert {type: "json"}

function writeAddress(serverIp) {
  Deno.writeFileSync("serverIp.json", new TextEncoder().encode(JSON.stringify(serverIp, null, 2)))
}

async function getAzureJson() {
  const regex = /<a[^>]+href=["'](https[^"']+\.json)["'][^"']*>/
  const res = await fetch("https://www.microsoft.com/en-us/download/confirmation.aspx?id=56519")
  const azure = await res.text()
  return await import(regex.exec(azure)[1], { assert: { type: "json" } })
}

const { default: { values: azure } } = await getAzureJson()

const server = {
  aws: [],
  google: [],
  azure: []
}

google.prefixes.forEach(
  item => {
    if (Object.hasOwn(item, "ipv4Prefix")) server.google.push(item.ipv4Prefix)
  }
)

aws.prefixes.forEach(
  item => {
    server.aws.push(item.ip_prefix)
  }
)

azure.forEach(
  item => {
    item.properties.addressPrefixes.forEach(ip => {
      if (!ip.includes(":")) server.azure.push(ip)
    })
  }
)

writeAddress(server)