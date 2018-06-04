// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const https = require('https');
const fs   = require('fs');
const path = require('path');
const cmd = require('node-cmd');
var connect = require('connect');
var serveStatic = require('serve-static');

const hostname = '0.0.0.0';
const port = 443;
var servCounter = 0; // it's okay that this will overflow

var key = fs.readFileSync('keys/domain.key');
var cert = fs.readFileSync( 'keys/domain.crt' );

var options = {
  key: key,
  cert: cert
};

cmd.get(`find ${__dirname}/../../ -name "15*" | while read line; do rm -rf $line; done`, function(errorCode, e__, o__) {
  if (errorCode) {
    console.log("FAILED", errorCode, e__, o__);
    process.exit(1);
  }

  var app = connect();

  app.use(function (req, res, next) {
      //res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, OPTIONS, HEAD");
      next();
  });

  app.use(serveStatic(__dirname + '/static'))
  app.use(serveStatic(__dirname + '/hosted'))

  app.use("/download", function(req, res, next) {
    if (req.method == 'POST') {
      var body = '';
      req.on('data', function (data) {
          body += data;
          if (body.length > 8192)
              req.connection.destroy();
      });

      req.on('end', function () {
          createBinary(req, res, body);
      });
    }
  });

  app.use("/ide", function(req, res, next) {
    renderIde(req, res)
  });

  app.use("/device", function(req, res, next) {
    renderDevice(req, res)
  });

  var getParams = function(url){
    let params = url.split('?'), args = { };
    if(params.length >= 2){
      params[1].split('&').forEach((param)=>{
          var items = param.split('=');
          try {
            args[items[0]] = items[1];
          } catch (e) {
            args[items[0]] = '';
          }
        })
    }
    return args;
  }

  app.use("/saveFile", function(req, res, next) {
    var args = getParams(req.url);
    fs.writeFileSync(unescape(args.path), unescape(args.txt));
    res.end('');
  });

  app.use("/build", function(req, res, next) {
    var args = getParams(req.url);
    createBinary(req, res, null, args);
  });

  app.use("/getFiles", function(req, res, next) {
    var args = getParams(req.url);
    require('./files.js').getHTML(unescape(args.path), function(error, html, js) {
      var writeString;
      if (error) {
        writeString = `
        <p>something bad has happened</p><h2>Error details below;</h2>${error};
        `;
      } else {
        writeString = html;
      }
      writeString = `
      {
        var data = '${escape(writeString)}';
        var eb = document.getElementById('explorerBase');
        var pr = eb.parentNode;
        pr.removeChild(eb);
        pr.innerHTML += unescape(data);
        setTimeout(function() {
          ${js}
        }, 100);
      }
      `;
      res.end(writeString);
    });
  });

  const server = https.createServer(options, app);
  server.listen(port, hostname, () => {
    console.log(`Server running at https://${hostname}/`);
  });
});

function createBinary(req, res, body, args) {
  var configs = {
    "SSID": { name: "WIFI_NAME", value: 0},
    "PASS": { name: "WIFI_PASSWORD", value: 0},

    "CONN": { name: "IOT_CENTRAL_CONNECTION_STRING", value: 0},

    "HUM": { name: "DISABLE_HUMIDITY", value: 0},
    "TEMP": { name: "DISABLE_TEMPERATURE", value: 0},
    "GYRO": { name: "DISABLE_GYROSCOPE", value: 0},
    "ACCEL": { name: "DISABLE_ACCELEROMETER", value: 0},
    "MAG": { name: "DISABLE_MAGNETOMETER", value: 0},
    "PRES":  { name: "DISABLE_PRESSURE", value: 0 },
    "SSSID": { name: "SSSID", value:0 }
  };
  var writeString = '';
  var failed = false;
  if (body) {
    var list = body.split('&');
    for (var i = 0; i < list.length; i++) {
      var arg = list[i].trim();
      if (arg.length == 0) continue;

      arg = arg.split('=');
      if (configs.hasOwnProperty(arg[0])) {
        var name = arg[0];
        if (arg.length > 1) {
          if (arg[1] == 'on') {
            configs[name].value = 1;
          } else {
            configs[name].value = arg[1];
          }
        } else {
          configs[name].value = 1;
        }

        if (arg.length > 2) {
          for (var j = 2; j < arg.length; j++) {
            configs[name].value += "=" + arg[j]
          }
        }
      }
    }

    if (!configs.SSSID.value || configs.SSSID.value.length == 0) {
      failed = true;
      writeString += ('<p>- Missing Session ID</p>');
    }

    if (!configs.SSID.value || configs.SSID.value.length == 0) {
      failed = true;
      writeString += ('<p>- Missing SSID</p>');
    }

    if (!configs.CONN.value || configs.CONN.value.length == 0) {
      failed = true;
      writeString += ('<p>- Missing IoT Central device connection string</p>');
    }
  }

  if (!failed) {
    var defs = [], definition_stuff = '';
    var NAME;
    if (body) {
      for(var o in configs) {
        if (!configs.hasOwnProperty(o)) continue;
        if (configs[o] == 0) continue;

        var line = '#define ' + configs[o].name;
        if (configs[o].value != 1 && o != 'SSSID') {
          line += '  \"' + unescape(configs[o].value) + '\"'
          defs.push(line);
        }
      }

      defs.push('#define COMPILE_TIME_DEFINITIONS_SET');
      defs = defs.join('\n').replace(/\"/g, "\\\"");
      NAME = configs.SSSID.value;
      definition_stuff = `echo "${defs}" > inc/definitions.h`;
    } else {
      NAME = args.sssid;
    }
    cmd.get(`
    cd ../../${NAME}
    ${definition_stuff}
    docker image prune -f
    iotc iotCentral.ino -c=a -t=AZ3166:stm32f4:MXCHIP_AZ3166
    `, function(errorCode, stdout, stderr) {
      var delCommand = body ? `&& rm -rf ../../${NAME}` : '';
      if (errorCode) {
        var output = stderr + stdout;
        if (output.indexOf('Arduino will switch to the default sketchbook') > 0) {
          output = output.substr(output.indexOf('Arduino will switch to the default sketchbook'));
          output = output.replace('[0mSketchbook folder disappeared: The sketchbook folder no longer exists.', '')
          var ind = output.indexOf('[0mRemoving intermediate container');
          if (ind > 0) {
            output = output.substr(0, ind);
          }
        }
        output = output.replace(/\[0m/g, '').replace(/\[91m/g, '')
                       .replace(/\[32m/g, '').replace(/\[33m/g, '')
                       .replace(/\[39m/g, '').replace(/\n/g, "<br>");

        writeString = '<p style="margin-top:0;padding-top:0">something bad has happened</p><h2>Error details below;</h2><p>' +
                        writeString + output + "</p>";
        if (delCommand.length) cmd.get(delCommand);
        failed = true;
        renderDownload(res, failed, writeString, body ? true : false)
      } else {
        var filename = path.join(__dirname, `../../${NAME}`, `out/program.bin`);
        var appName = "program.bin"
        cmd.get(`mkdir -p hosted/${NAME} && mv ${filename} hosted/${NAME}/ ${delCommand}`, function(e, s, r) {
          // res.write(writeString);

          if (e) {
            writeString = ('<p>something bad has happened</p><h2>Error details below;</h2><p>' +
              writeString +
              (s + r).replace(/\n/g, "<br>")) + "</p>";
            failed = true;
          } else {
            if (body) {
              writeString += `
              <p>MXChip AZ3166 bootloader</p>
              <h2>It's Ready!</h2>
              <p>Your personalized bootloader is ready.<br/>Pick one of the options below;</p><p style='margin:10px'>&nbsp;</p>
              `;
            }
            writeString += `
            <a id='btnD' class='btnx' href="${NAME}/program.bin">Download Firmware</a> <p style='margin:5px'>&nbsp;</p>
            <a id='btn' class='btnd' style='display:none' href="#">Flash Firmware to USB</a> <p>&nbsp;</p>`;
          }
          renderDownload(res, failed, writeString, body ? true : false)
        });
      }
    });
  } else {
    renderDownload(res, failed, writeString, body ? true : false)
  }
}

function renderDownload(res, failed, writeString, isFull) {
  var render = fs.readFileSync(__dirname + "/static/download.html") + "";
  render = render.replace("$OUTPUT", writeString)
                 .replace("$NO_ISSUE", !failed)
                 .replace("$FULL_VIEW", isFull + "");

  res.end(render);
}

function renderIde(req, res, failed) {
  var render = fs.readFileSync(__dirname + "/static/ide.html") + "";
  var NAME = (Date.now() + "" + servCounter);
  servCounter += Date.now() % 2 == 0 ? 11 : 13;
  cmd.get(`
  cp -R ../../AZ3166 ../../${NAME}
  `, function(errorCode, stdout, stderr) {
    if (errorCode) {
      var writeString = ('<p>something bad has happened</p><h2>Error details below;</h2><p>' +
        (stdout + stderr).replace(/\n/g, "<br>")) + "</p>";
      cmd.get(`rm -rf ../../${NAME}`);
      render = render.replace("$OUTPUT", writeString);
      res.end(render);
    } else {
      require('./files.js').getHTML(`../../${NAME}`, function(error, html, js) {
        if (error) {
          var writeString = '<p>something bad has happened</p><h2>Error details below;</h2>' + error;
          cmd.get(`rm -rf ../../${NAME}`);
          render = render.replace("$OUTPUT", writeString);
          res.end(render);
          return;
        }
        render = render.replace("$OUTPUT", html + "<script>" + js + "</script>");
        render = render.replace("$SSSID", NAME);
        res.end(render);
      });
    }
  });
}

function renderDevice(req, res, failed) {
  var render = fs.readFileSync(__dirname + "/static/device.html") + "";
  var NAME = (Date.now() + "" + servCounter);
  servCounter += Date.now() % 2 == 0 ? 11 : 13;
  cmd.get(`
  cp -R ../../AZ3166 ../../${NAME}
  `, function(errorCode, stdout, stderr) {
    if (errorCode) {
      var writeString = ('<p>something bad has happened</p><h2>Error details below;</h2><p>' +
        (stdout + stderr).replace(/\n/g, "<br>")) + "</p>";
      cmd.get(`rm -rf ../../${NAME}`);
      render = render.replace("$OUTPUT", writeString);
      res.end(render);
    } else {
      render = render.replace("$OUTPUT", "");
      render = render.replace("$SSSID", NAME);
      res.end(render);
    }
  });
}
