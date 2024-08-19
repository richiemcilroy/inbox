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

**Note:** This script assumes a `.env.test.local` file exists with the following values as specified in `env.ts`:

```
MAILBRIDGE_TRANSACTIONAL_CREDENTIALS={"apiUrl":"https://example.com","apiKey":"your-api-key","sendAsName":"Sender Name","sendAsEmail":"sender@example.com"}
```

---

## Example

```sh
pnpm stress:email email=test@example.com amount=10 interval=30 mode=reply-chain
```

This will send 10 emails to `test@example.com` with a 30-second interval in reply-chain mode.
