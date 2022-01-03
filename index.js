const root = process.env.PWD;
require("pino-pretty");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });
const fastify = require("fastify")({
  logger: false
});

const fastifyFlash = require("fastify-flash");
const Client = require("ssh2").Client;

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
  root: path.join(__dirname, "views")
});
fastify.get("/", async function(req, res) {
  if (!req.session.get("username")) {
    res.view("start");
  } else {
    const host = req.session.get("host");
    const port = req.session.get("port");
    const username = req.session.get("username");
    const password = req.session.get("password");
    const curdir = req.query.dir + "/";
    let filelist;

    const conn = new Client();
    await conn
      .on("ready", () => {
        console.log("Client :: ready");
        conn.sftp((err, sftp) => {
          if (err) throw err;
          sftp.readdir(`${curdir}`, (err, list) => {
            if (err) req.session.set("error", err);
            filelist = list;
            conn.end();
          });
        });
      })
      .connect({
        host: host,
        port: port,
        username: username,
        password: password
      });
    conn.on("end", () => {
      if (req.session.get("error")) {
      }
      res.view("filebrowse", {
        filelist: filelist,
        curdir: curdir
      });
    });
  }
});
fastify.post("/init", async function(req, res) {
  const { host, port, username, password } = req.body;
  req.session.set("host", host);
  req.session.set("port", port);
  req.session.set("username", username);
  req.session.set("password", password);
  req.session.set("curdir", "/");

  res.redirect("/?dir=/");
});
fastify.get("/logout", async function(req, res) {
  req.session.delete();
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
