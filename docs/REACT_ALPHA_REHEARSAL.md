# PortableDoc React alpha rehearsal

This branch is a review candidate only. It deliberately does not add a registry dependency or change a production pin.

The tested hosted artifact is `portable-doc-react-0.1.0-alpha.1.tgz` from PortableDoc source
`976855af9085c6c3840359f79016822adf5c300d`, with SHA-256
`5aa1eed120d95ecc5f09fed68c366a85ca61f3c6f66df10d835b1575c4f855a4`.
Its embedded `SOURCE.json` identifies canonical Barkpark renderer
`cbd5282b4dce9c4c2ee7a567d24b23b4a8bae1d3`.

From a clean checkout:

```bash
npm ci
npm run check:react-alpha -- /absolute/path/portable-doc-react-0.1.0-alpha.1.tgz
```

The checker verifies the filename, digest, package version, embedded renderer source, and the hosted
`provenance.json` sidecar when it is beside the tarball. It installs the tarball only into the disposable
`node_modules` tree, refuses any package or lockfile mutation, then runs lint, the exact committed 80-row
conformance report, and the production build.

The committed golden pack has stamp
`5b3a5a973934a87e3431756d164c2197d1078ec9dd3420bad1c889df673eb9b5`.
