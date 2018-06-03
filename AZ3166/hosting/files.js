
const path = require('path');
const fs = require('fs');

var exclude = {
  '.DS_Store' : 1,
  'out': 1,
  '.gitignore': 1
};

var getFiles = function(folder, cb) {
  fs.readdir(folder, function (error, files) {
    if (error) { cb(error); return; }
    var data = [];
    files.forEach(function (file) {
      try {
        if (!exclude.hasOwnProperty(file)) {
          var isdir = fs.statSync(path.join(folder, file)).isDirectory();
          if (isdir) {
            data.push({ name : file, isdir: true, path : path.join(folder, file), ext: 'dir' });
          } else {
            var ext = path.extname(file).toLowerCase();
            if (!ext) ext = '';
            var loc = path.join(folder, file);
            var ccc = 'TOO BIG FILE';
            if (ext != ".wav") {
              var f = fs.readFileSync(loc) + "";
              if (f.length < 32 * 1024) {
                ccc = escape(f);
              }
            }
            var info = { name : file, contents:ccc, isdir: false, path : loc, ext: ext };
            if (ccc == 'TOO BIG FILE') {
              info.bigFile = true;
            }
            data.push(info);
          }
        }
      } catch(e) {
        console.log(e)
      }
    }); // files.forEach
    cb(null, data);
  }); // fs.readdir
};

var extTable = {
  'dir': '[ ]',
  '.md': 'MD',
  '.js': 'JS',
  '.cpp': 'C++',
  '.c': 'C',
  '.hpp': 'HPP',
  '.h': 'H',
  '.ino': 'INO',
  '.txt': 'TXT',
  '.json': '{ }',
  '.lib': '(@)',
  '.html': '< >',
  '.wav': 'WAV',
  '.png': 'PNG',
  '': ''
};

var uq = 0;
exports.getHTML = function(folder, cb) {
  getFiles(folder, function(error, files) {
    var html, js = '';
    if (!error) {
      var ind = folder.indexOf('/', 7);
      if (ind == -1) ind = folder.length;
      var backf = folder.substr(0, ind);
      files.unshift({ name : "..", isdir: true, path : backf, ext: 'dir' });
      html = `<div id='explorerBase' class='explorer'>
      <script>
      window.fileData = {};
      window.fileIds = {};
      window.SelectedItem = null;

      function serverSave(path, txt) {
        var explorerBase = document.getElementById('explorerBase');
        var scriptChild = document.createElement('script');
        scriptChild.src = '/saveFile?path=' + escape(path) + '&txt=' + txt;
        explorerBase.appendChild(scriptChild);
      }

      window.saveContent = function() {
        if (window.SelectedItem) {
          window.SelectedItem.selected_ = false;
          window.SelectedItem.className = window.SelectedItem.className.split(' ')[0];
          var pth = window.fileIds[window.SelectedItem.id]
          var code = window.fileData[pth];
          if (code.bigFile) return;
          if (!code.isdir) {
            var content = escape(editor.getValue());
            if (code.contents != content) {
              code.contents = content;
              serverSave(pth, content);
            }
          }
        }
      }

      function fileClick(fileId, name, json) {
        if (fileId.selected_) {
          return;
        }

        window.saveContent();
        if (json.isdir == false) {
          document.getElementById('fileNameDiv').innerText = name;
          window.SelectedItem = fileId;
          window.SelectedItem.selected_ = true;
          window.SelectedItem.className += " " + "selected";
          window.editor.setValue(unescape(json.contents))
        } else {
          updateBrowser(json.path);
        }
      }

      function updateBrowser(path) {
        var explorerBase = document.getElementById('explorerBase');
        var scriptChild = document.createElement('script');
        scriptChild.src = '/getFiles?path=' + escape(path);
        explorerBase.appendChild(scriptChild);
      }
      </script><ul>`;

      var id = uq;
      files.forEach(function (file) {
        html += `<li class='explorer_${file.isdir}' id='file_${++uq}'>
          <span class='exp_sub exp_sub_${extTable[file.ext]}'>${extTable[file.ext]} </span>${file.name}</li>
          `;
      });
      html += "</ul>";
      js = '';
      files.forEach(function (file) {
        js += `
          var file_${++id} = document.getElementById('file_${id}');
          window.fileData['${file.path}'] = JSON.parse(unescape('${escape(JSON.stringify(file))}'));
          window.fileIds['file_${id}'] = '${file.path}';
          file_${id}.addEventListener('click', function() {
            fileClick(file_${id}, '${file.path.replace(backf, '')}', window.fileData['${file.path}']);
          })
      `;});
      html += '</div>';
    }
    cb(error, html, js);
  });
};