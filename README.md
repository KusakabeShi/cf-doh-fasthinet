# Cloudflare DoH

Due to cloudflare route all traffic from hinet to california, this DoH proxy replace all results belongs to [cloudflare IPs](https://www.cloudflare.com/ips/) to `1.0.0.1` and `2606:4700:4700::1001` to make the connection faster.

## Usage

1. Create a cloudflare worker.
2. Click `Quick edit` and fill [index.js](https://github.com/KusakabeSi/cf-doh-fasthinet/blob/main/index.js) into it.
3. Modify your hosts file (Windows: `C:\Windows\System32\drivers\etc\hosts`, linux: `/etc/hosts`)
4. Add following lines:
```
1.1.1.1 doh.kskbcf.workers.dev
2606:4700:4700::1111 doh.kskbcf.workers.dev
```
5. Edit your browser settings, use `doh.kskbcf.workers.dev` as your DoH server.
6. Remember replace all `doh.kskbcf.workers.dev` to your own worker domain.
