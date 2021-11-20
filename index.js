/**
 * Generate DNS over HTTPS from Google.
 * @param {Event} event - worker event
 */
function get_better_ans(version) {
    if (version === 4) {
        return "1.0.0.1"
    } else if (version === 6) {
        return "2606:4700:4700::1001"
    }
}

async function get_cf_nets(version) {
    const response = await fetch("https://www.cloudflare.com/ips-v" + version);
    return await response.text()
}

function IPnumber(IPaddress, version) {
    let number = 0n;
    let exp = 0n;
    if (version === 4) {
        var ip = IPaddress.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
        if (ip) {
            return (BigInt(ip[1]) << 24n) + (BigInt(ip[2]) << 16n) + (BigInt(ip[3]) << 8n) + (BigInt(ip[4]));
        }
    } else if (version === 6) {
        if (/(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/gi.test(IPaddress)) {
            const parts = IPaddress.split(":");
            const index = parts.indexOf("");
            if (index !== -1) {
                while (parts.length < 8) {
                    parts.splice(index, 0, "");
                }
            }

            for (const n of parts.map(part => part ? `0x${part}` : `0`).map(Number).reverse()) {
                number += BigInt(n) * (2n ** BigInt(exp));
                exp += 16n;
            }

            return number;
        }
    }
    return null;
}

function IPmask(masklen, version) {
    if (version === 4) {
        zeros = 32n - BigInt(masklen)
        return ((1n << 32n) - 1n) >> zeros << zeros
    } else if (version === 6) {
        zeros = 128n - BigInt(masklen)
        return ((1n << 128n) - 1n) >> zeros << zeros
    }
    return 0;
}

const handleRequest = async event => {
    const url = new URL(event.request.url);
    const name = url.searchParams.get("name");
    const type = url.searchParams.get("type");
    const responseInit = {
        headers: {
            "Content-Type": "application/x-javascript; charset=UTF-8",
            "Access-Control-Allow-Origin": "*"
        }
    };
    
    if ((type == null || type == "") || (name == null || name == "")) {
        var request = event.request;
        url.host = "cloudflare-dns.com";
        const modifiedRequest = new Request(url, {
            body: request.body,
            headers: request.headers,
            method: request.method
        })
        let response = await fetch(modifiedRequest);
        return new Response(response.body,  {
            headers: response.headers
        });
    }

    const response = await fetch(
        "https://cloudflare-dns.com/dns-query?name=" +
        name +
        "&type=" +
        type +
        "&ct=application/dns-json"
    );
    if (type === "A") {
        var version = 4

    } else if (type === "AAAA") {
        var version = 6
    }
    cf_nets = await get_cf_nets(version)
    response_json = await response.text()
    response_json = JSON.parse(response_json)
    if (Array.isArray(response_json["Answer"])) {


        for (ans of response_json["Answer"]) {
            let numIP = IPnumber(ans["data"], version)
            if (numIP === null) {
                continue;
            }
            for (cf_net of cf_nets.split("\n")) {
                let cf_neta = cf_net.split("/")
                let cf_ip = IPnumber(cf_neta[0], version)
                let cf_len = cf_neta[1]
                let ip_mask = IPmask(cf_len, version)

                let numIP_net = numIP & ip_mask
                let cf_ip_net = cf_ip & ip_mask

                if (numIP_net === cf_ip_net) {
                    //console.log(ans["data"] + " in " + cf_net)
                    ans["data"] = get_better_ans(version)
                    break;
                } else {
                    //console.log(ans["data"] + " not in " + cf_net)
                }
            }
        }
    }


    return new Response(JSON.stringify(response_json), responseInit);
};

addEventListener("fetch", event => event.respondWith(handleRequest(event)));
