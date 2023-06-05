import { parse } from 'std/csv/mod.ts'
import * as cherrio from 'cheerio'

import aws from 'https://ip-ranges.amazonaws.com/ip-ranges.json' assert {
  type: 'json',
}
import google from 'https://www.gstatic.com/ipranges/cloud.json' assert {
  type: 'json',
}

function writeAddress(destIP, fileName) {
  if (fileName.endsWith('json')) {
    Deno.writeFileSync(
      fileName,
      new TextEncoder().encode(JSON.stringify(destIP, null, 2)),
    )
  }
  if (fileName.endsWith('txt')) {
    Deno.writeFileSync(fileName, new TextEncoder().encode(destIP))
  }
}

async function getAzureJson() {
  const regex = /<a[^>]+href=["'](https[^"']+\.json)["'][^"']*>/
  const res = await fetch(
    'https://www.microsoft.com/en-us/download/confirmation.aspx?id=56519',
  )
  const azure = await res.text()
  return await import(regex.exec(azure)[1], { assert: { type: 'json' } })
}

async function parseDigitalOcean() {
  const csvIPRes = await fetch('https://www.digitalocean.com/geo/google.csv')
  const csvIPText = await csvIPRes.text()
  return await parse(csvIPText, {
    skipFirstRow: false,
  })
}

async function getAlibabaJson() {
  const alibaba = []
  const res = await fetch("https://www.alibabacloud.com/help/en/data-transmission-service/latest/whitelist-dts-ip-ranges-for-your-user-created-database")
  const htmlPage = await res.text()
  const $ = cherrio.load(htmlPage)
  $("#tbody-3wo-jt9-lfk").children().each((_index, el) => {
    alibaba.push(...$(el).children().eq(1).text().split(','))
  })
  return alibaba
}

const { default: { values: azure } } = await getAzureJson()
const alibaba = await getAlibabaJson()
const digO = await parseDigitalOcean()

const server = {
  aws: [],
  google: [],
  azure: [],
  digitalOcean: [],
  alibaba: alibaba
}

google.prefixes.forEach(
  (item) => {
    if (Object.hasOwn(item, 'ipv4Prefix')) {
      server.google.push(item.ipv4Prefix)
    }
  },
)

aws.prefixes.forEach(
  (item) => {
    server.aws.push(item.ip_prefix)
  },
)

azure.forEach(
  (item) => {
    item.properties.addressPrefixes.forEach((ip) => {
      if (!ip.includes(':')) server.azure.push(ip)
    })
  },
)

digO.forEach(([ip]) => {
  if (!ip.includes(':')) server.digitalOcean.push(ip)
})

// All cloud IP
writeAddress(server, 'all.json')

// Single IP
Object.keys(server).forEach((item) =>
  writeAddress(server[item].join('\n'), `${item}.txt`)
)
