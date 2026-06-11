const url = process.env.TEST_URL || "http://localhost:3000/api/manychat";
const secret = process.env.WEBHOOK_SECRET || "";

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(secret ? { "x-webhook-secret": secret } : {})
  },
  body: JSON.stringify({
    first_name: "Cliente Teste",
    username: "cliente_teste",
    message: "quanto está o fundi salgado?"
  })
});

console.log("Status:", response.status);
console.log(await response.text());
