const url = process.env.TEST_URL || "http://localhost:3000/api/manychat";
const secret = process.env.WEBHOOK_SECRET || "";

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(secret ? { "x-webhook-secret": secret } : {})
  },
  body: JSON.stringify({
    subscriber_id: "teste-local",
    first_name: "Cliente",
    username: "cliente_teste",
    message: "Queria o cardápio",
    last_intent: "",
    last_topic: ""
  })
});

console.log("Status:", response.status);
console.log(await response.text());
