export const config = () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  mongo: {
    uri: process.env.MONGO_URI,
  },
  redis: {
    url: process.env.REDIS_URL,
    user: process.env.REDIS_USER,
    password: process.env.REDIS_PASSWORD,
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
  },
  twilio: {
    sid: process.env.TWILIO_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
  },
  misc: {
    port: +process.env.PORT,
  },
});

export type Config = ReturnType<typeof config>;
