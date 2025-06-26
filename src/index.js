const express =require("express");
const dotenv =require( "dotenv");
const startCronScheduler =require ("./jobs/cronScheduler.js");

dotenv.config();

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
  startCronScheduler();
});
