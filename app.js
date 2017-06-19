const generatePromises = (names) => {
   return names.map((name) => JSONP(name));
}

const parseText = (text) => {
    let elemFind = false;
    const parsedText = text.parse.text['*'];

    const regExpForUrls = new RegExp(`<a href="/wiki/[A-Za-z0-9-]+`, 'g');

    return _.uniq(parsedText.match(regExpForUrls)).map((item) => item.replace(new RegExp(`^<a href="/wiki/`), ''));

}

const resultData = {
  currentLevel: 0,
  levels: {
  }
};

const findInResponseText = (newTexts, findName) => {
    let find = false;
  for (let value of newTexts) {
      const findIntoText = value.text.find((name) => findName === name);
      if (findIntoText) {
          value.path.push(findName);
          find = value.path;
          break;
      }
  }

  return find;
}

const generateNewPathForNewNames = (names, startName) => {
    const processingTitles = [];
    const newNames = [];

    for (let value of names) {
        for (let i = 0; value.text.length > i; i++) {
            const findInProcessing = processingTitles.find((item) => item.name === value.text[i]);
            if (!findInProcessing && value.text[i] !== startName) {
                processingTitles.push({
                    name: value.text[i],
                    path: [...value.path, value.text[i]]
                });
            }
        }
    }

    return processingTitles;
}

const getResponse = (resolve, data) => {
  const allTexts = data.map((item) => {
      item.text = parseText(item.text);
      return item;
  });

  const find = findInResponseText(allTexts, resultData.findName);
  
  const processingTitles = generateNewPathForNewNames(allTexts, resultData.startName);
  if (find) {
    resolve(find);
  } else {
    const newPromises = generatePromises(processingTitles);

    if (resultData.currentLevel !== 2) {
        // не нравиться привязывать но не мойму как избавиться от этого
      Promise.all(newPromises).then(getResponse.bind(this, resolve));
    } else {
        resolve(null);
    }

    resultData.currentLevel++;
  }
}

const setResultData = (firstTitle, secondTitle) => {
    resultData.levels[0] = [{
          name: firstTitle,
          path: [firstTitle]
      }];

    resultData.findName = secondTitle;
    resultData.startName = firstTitle;

    return resultData.levels[0];
}

const searchWiki = (firstTitle, secondTitle) => new Promise((resolve, reject) => {

     const dataForPromise = setResultData(firstTitle, secondTitle);

     let newElements = generatePromises(dataForPromise);
     
     Promise.all(newElements).then(getResponse.bind(this, resolve));
  });

const JSONP = (element) => {
  const newSrcTag = document.createElement('script');
  let resolve, reject;
  JSONP.countFn++;

  const newName = `name${JSONP.countFn}`;

  const newFn = function (text) {
    delete window[newName];
    document.head.removeChild(newSrcTag);

    resolve(Object.assign({}, element, {
        text,
    }));
  }

  window[newName] = newFn;

  const url = `http://en.wikipedia.org/w/api.php?action=parse&
page=${element.name}&prop=text&section=0&format=json&callback=${newName}`;

  newSrcTag.setAttribute('src', url);

  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });

  document.head.appendChild(newSrcTag);
  
  return promise;
}

JSONP.countFn = 0;

searchWiki('Microsoft', 'Nintendo').then((result) => {
    console.log(result);
});