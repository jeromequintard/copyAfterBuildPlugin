const fs = require('fs');
const path = require('path');

const status = {
  success: {
    color: 32,
    text: 'Success',
  },
  error: {
    color: 31,
    text: 'Error',
  },
  info: {
    color: 34,
    text: 'Info',
  },
};

class CopyAfterBuildPlugin {

  constructor(options) {
    this.options = options;
  }

  // On accède à l'instance du compilateur
  apply(compiler) {
    // Une fois que la compilation est entièrement terminée
    compiler.plugin('after-emit', (compilation, callback) => {

      const buf = [];
      const module = compiler.options.output.library.toLowerCase();
      const from = compiler.options.output.path;
      const to = this.options.to;

      buf.push('\x1b[44m\x1b[37mCopy files after emit\x1b[0m');

      // Pour chaque chunk
      compilation.chunks.forEach((chunk) => {
        // On définit le répertoire de destination
        const destPath = path.resolve(to, module);
        // On regarde si le dossier de destination existe
        fs.exists(destPath, (exists) => {
          const assert = this.assertCmd('Create directory', module);
          // Si il n'existe pas
          if (!exists) {
            // On le créé
            fs.mkdir(destPath, (ex) => {
              if (!ex) {
                buf.push(this.assertValue(assert, status.success));
                // Un fois créé on copie les fichiers
                this.copyFiles(chunk.files, from, to, module).then((results) => {
                  this.finally(buf, results);
                });
              // En cas d'exception sur la création du répertoire
              } else {
                buf.push(this.assertValue(assert, status.error));
              }
            });
          } else {
            buf.push(this.assertValue(assert, status.info, 'Exist'));
            // Le répertoire existe, on créé les fichiers
            this.copyFiles(chunk.files, from, to, module).then((results) => {
              this.finally(buf, results);
            });
          }
        });
      });

      callback();
    });
  }

  finally(buf, files) {
    console.log(buf.concat(files).join('\n'));
  }

  assertCmd(cmd, message) {
    return `\u001b[1m\x1b[34m${cmd}: \x1b[0m${message}`;
  }

  assertValue(message, state, text = null) {
    text = state.text || text;
    return `${message} \x1b[${state.color}m[${text}]\x1b[0m`;
  }

  copyFiles(files, sourcePath, destPath, folder) {
    // On créé une promesse autout de l'énumération
    return Promise.all(
      // pour chaque fichier
      files.map((file) => {
        const source = path.resolve(sourcePath, file);
        const dest = path.resolve(destPath, folder, file);
        const assert = this.assertCmd('Copy', `${folder}\\${file}`);

        // On copie le fichier
        return this.copyFile(source, dest)
          .then(() => {
            return this.assertValue(assert, status.success);
          })
          .catch((ex) => {
            return this.assertValue(assert, status.error);
          });
      })
    ).then((results) => {
      // Tout est terminé, on renvoi les résultats
      return results;
    });
  }

  // Copie un fichier
  copyFile(source, target) {
    // On retourne promesse
    return new Promise((resolve, reject) => {
      // On créé un streamreader
      const sr = fs.createReadStream(source);
      // On créé un streamwriter
      const sw = fs.createWriteStream(target);

      // En cas d'erreur
      const catchReject = (ex) => {
        // On détruit le streamreader
        sr.destroy();
        // On referme le streamwriter
        sw.end();
        // On rejette
        reject(ex);
      };

      // En cas d'erreur ou de succès
      sr.on('error', catchReject);
      sw.on('error', catchReject);
      sw.on('close', resolve);

      // On met dans le pipe l'opération
      sr.pipe(sw);
    });
  }
}

module.exports = CopyAfterBuildPlugin;
