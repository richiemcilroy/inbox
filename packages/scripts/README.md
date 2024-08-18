# @scripts

## Usage

To send emails using the script, run the following command:

```sh

pnpm stress:email email=some@**gmail**.com amount=100 [interval=60] [mode=individual|reply-chain]

```

- `email`: The recipient's email address.
- `amount`: Number of emails to send.
- `interval` (optional): Time in seconds between emails. Default is 60.
- `mode` (optional): `individual` or `reply-chain`. Default is `individual`.

---

## Example

```sh
pnpm stress:email email=test@example.com amount=10 interval=30 mode=reply-chain
```

This will send 10 emails to `test@example.com` with a 30-second interval in reply-chain mode.
