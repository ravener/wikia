# Wikia
A simple wrapper to interact with the [Wikia API](https://wikia.com/api/v1).

## Install
```sh
npm install wikia
```

## Usage
```js
const Wikia = require("wikia");

// for http://miraculousladybug.wikia.com
const wikia = new Wikia({ wiki: "miraculousladybug" });
// Leave wiki empty for cross-wiki actions however some methods requires a wiki

// All methods returns a Promise
// you can eiher use it with .then(callback)
// or use async/await
// for this example we will create an annonymous async function to use await.
(async() => {
  const articles = await wikia.getTopArticles();
  console.log(articles);

  console.log(await wikia.getWikiData());
})();
```

## Useful Links
- [Documentation](https://wikia.itsladybug.tk) for full documentation.
- [Discord Server](https://discord.gg/mDkMbEh) best way to contact me.
- [Wikia API Documentation](http://wikia.com/api/v1) to see response body schemas, etc.

## License
MIT
