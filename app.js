// fix me
let currentQueue = [];
const paralelRequestCount = 3;
let findResult = false;

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

const findInResponseText = (newTexts, findName, path) => {
    let find = false;
  for (let value of newTexts) {
      const findIntoText = findName === value;
      if (findIntoText) {
          path.push(findName);
          find = path;
          break;
      }
  }

  return find;
}

const generateNewPathForNewNames = (names, startName, path) => {
    const processingTitles = [];
    const newNames = [];

        for (let i = 0; names.length > i; i++) {
            const findInProcessing = processingTitles.find((item) => item.name === names[i]);
            if (!findInProcessing && names[i] !== startName) {
                processingTitles.push({
                    id: Math.random(),
                    name: names[i],
                    path: [...path, names[i]]
                });
            }
        }

    return processingTitles;
}

const getResponse = (resolve, data) => {
  const removeIndex = currentQueue.findIndex(item => item.id === data.id);
  currentQueue.splice(removeIndex, 1);

  const allTexts = parseText(data.text);
  const find = findInResponseText(allTexts, resultData.findName, data.path);
  
  const processingTitles = generateNewPathForNewNames(allTexts, resultData.startName, data.path);
  if (data.path.length < 3) {
      currentQueue = [...currentQueue, ...processingTitles];
  }
  if (find) {
    resolve(find);
    currentQueue.length = 0;
    findResult = true;
  }
  if (!findResult) {
    checkRunNextRequest(data, resolve);
  }
}

const checkRunNextRequest = (data, resolve) => {
    const findAllPending = currentQueue.filter(item => item.status);
    let nextData;

    if (findAllPending.length < paralelRequestCount) {
      const findIndex = currentQueue.findIndex(item => item.path.length === data.path.length && !item.status);

        if (findIndex !== -1) {
            currentQueue[findIndex].status = 'pending';
            JSONP(currentQueue[findIndex]).then(r => getResponse(resolve, r));
            nextData = currentQueue[findIndex];
        } else {
                const nextLevelElement = currentQueue.findIndex(item => item.path.length === data.path.length + 1 && !item.status);
                if (nextLevelElement !== -1) {
                    currentQueue[nextLevelElement].status = 'pending';
                    JSONP(currentQueue[nextLevelElement]).then(r => getResponse(resolve, r));
                    nextData = currentQueue[nextLevelElement];
                }  
        }

        if (nextData) {
            checkRunNextRequest(nextData, resolve);
        }
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

const searchWiki = async (firstTitle, secondTitle) => new Promise((resolve, reject) => {

     const dataForPromise = setResultData(firstTitle, secondTitle);

     dataForPromise[0].status = 'pending';
     dataForPromise[0].id = Math.random();

     currentQueue.push(dataForPromise[0]);

     const firstPromise = JSONP(dataForPromise[0]).then(r => getResponse(resolve, r));
     checkRunNextRequest(dataForPromise[0]);
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