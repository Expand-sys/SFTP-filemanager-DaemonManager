const Client = require("ssh2").Client;
const root = process.env.PWD;
require("pino-pretty");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });
const fastify = require("fastify")({
  logger: false
});

const fastifyFlash = require("fastify-flash");

const path = require("path");
const fs = require("fs");

fastify.register(require("fastify-formbody"));
fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/" // optional: default '/'
});

fastify.register(require("fastify-secure-session"), {
  // the name of the session cookie, defaults to 'session'
  cookieName: "session",
  // adapt this to point to the directory where secret-key is located
  key: fs.readFileSync(path.join(__dirname, "secret-key")),
  cookie: {
    path: "/",
    // options for setCookie, see https://github.com/fastify/fastify-cookie
    secure: true,
    httpOnly: true,
    overwrite: true
  }
});
fastify.register(fastifyFlash);
fastify.register(require("point-of-view"), {
  engine: {
    pug: require("pug")
  },
  defaultContext: {
    random: papy()
  },
  root: path.join(__dirname, "views")
});
fastify.get("/", async function(req, res) {});
fastify.post("/setup", async function(req, res) {
  const { url, secure } = req.body;
  if (secure) {
    process.env.SECURE = true;
  }
  process.env.BANKAPIURL = url;
  console.log(process.env.BANKAPIURL);
  fs.rmSync(`${root}/.env`);
  fs.writeFileSync(
    `${root}/.env`,
    "BANKAPIURL=" +
      process.env.BANKAPIURL +
      "\n" +
      "SECURE=" +
      process.env.SECURE +
      "\nSETUP=true"
  );

  fs.writeFileSync(`${root}/tmp/restart.txt`, "");
  res.redirect("/");
});

process.on("SIGINT", function() {
  process.exit();
});

fastify.listen(process.env.PORT || 3000, "0.0.0.0", function(err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`server listening on ${address}`);
  console.log(`server running on ${address}`);
});
