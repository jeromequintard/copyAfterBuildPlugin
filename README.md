# copyAfterBuildPlugin
Ecoute la compilation de webpack et copie les assets générés dans un répertoire spécifique :

```
const CopyAfterBuildPlugin = require('copy-after-build-plugin');

plugins: [
  new CopyAfterBuildPlugin({
    to: '../shared/modules/',
  }),
],
```
