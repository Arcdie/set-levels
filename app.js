const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

let settings = {
  userId: false,
  userName: false,
  areModulesLoaded: false,
  pathToCscalpFolder: false,
};

const updateSettings = () => {
  fs.writeFileSync('settings.json', JSON.stringify(settings));
};

if (fs.existsSync('settings.json')) {
  settings = fs.readFileSync('settings.json', 'utf8');
  settings = JSON.parse(settings);
} else {
  fs.writeFileSync('settings.json', JSON.stringify(settings));
}

if (!settings.areModulesLoaded) {
  execSync('npm i --loglevel=error');
  settings.areModulesLoaded = true;
  updateSettings();
}

const xml2js = require('xml2js');
const moment = require('moment');

const {
  getUser,
} = require('./trading-helper/get-user');

const {
  getUserLevelBounds,
} = require('./trading-helper/get-user-level-bounds');

const {
  getActiveInstruments,
} = require('./trading-helper/get-active-instruments');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const start = async () => {
  if (!settings.pathToCscalpFolder) {
    return askQuestion('whereCScalpFolder');
  }

  const pathToSettingsFolder = `${settings.pathToCscalpFolder}\\SubApps\\CScalp\\Data\\MVS`;

  if (!fs.existsSync(pathToSettingsFolder)) {
    console.log('Не нашел папку с настройками cscalp');
    return askQuestion('whereCScalpFolder');
  }

  if (!settings.userName || !settings.userId) {
    return askQuestion('userName');
  }

  // get active instruments
  const resultGetActiveInstruments = await getActiveInstruments();

  if (!resultGetActiveInstruments || !resultGetActiveInstruments.status) {
    console.log(resultGetActiveInstruments.message || 'Cant resultGetActiveInstruments');
    return false;
  }

  const resultActiveInstruments = resultGetActiveInstruments.result;

  if (!resultActiveInstruments || !resultActiveInstruments.status) {
    console.log(resultActiveInstruments.message || 'Cant getActiveInstruments');
    return false;
  }

  if (!resultActiveInstruments.result || !resultActiveInstruments.result.length) {
    return false;
    console.log('No active instruments. Process was finished');
  }

  const instrumentsDocs = resultActiveInstruments.result;

  // get user level bounds
  const resultGetUserLevelBounds = await getUserLevelBounds({
    userId: settings.userId,
  });

  if (!resultGetUserLevelBounds || !resultGetUserLevelBounds.status) {
    console.log(resultGetUserLevelBounds.message || 'Cant resultGetUserLevelBounds');
    return false;
  }

  const resultUserLevelBounds = resultGetUserLevelBounds.result;

  if (!resultUserLevelBounds || !resultUserLevelBounds.status) {
    console.log(resultUserLevelBounds.message || 'Cant resultGetUserLevelBounds');
    return false;
  }

  if (!resultUserLevelBounds.result || !resultUserLevelBounds.result.length) {
    return false;
    console.log('No levels. Process was finished');
  }

  const userLevelBounds = resultUserLevelBounds.result;
  const filesNames = fs.readdirSync(pathToSettingsFolder);

  instrumentsDocs.forEach(instrumentDoc => {
    instrumentDoc.user_level_bounds = userLevelBounds
      .filter(bound => bound.instrument_id === instrumentDoc._id)
      .map(bound => ({
        created_at: bound.created_at,
        level_price: bound.level_price,
      }));
  });

  await Promise.all(instrumentsDocs.map(async instrumentDoc => {
    if (!instrumentDoc.user_level_bounds
      || !instrumentDoc.user_level_bounds.length) {
      return null;
    }

    let instrumentName = instrumentDoc.name;
    const isFutures = instrumentDoc.is_futures;

    if (isFutures) {
      instrumentName = instrumentName.replace('PERP', '');
    }

    let validString = '';
    instrumentDoc.user_level_bounds.forEach(bound => {
      const validDate = moment(bound.created_at).format('DD.MM.YYYY');
      validString += `${bound.level_price}/${validDate};`;
    });

    filesNames.forEach(async fileName => {
      if (!fileName.includes(instrumentName)) {
        return true;
      }

      const fileContent = fs.readFileSync(`${pathToSettingsFolder}/${fileName}`, 'utf8');
      const parsedContent = await xml2js.parseStringPromise(fileContent);

      parsedContent.Settings.DOM[0].UserLevels[0].$.Value = validString;

      const builder = new xml2js.Builder();
      const xml = builder.buildObject(parsedContent);
      fs.writeFileSync(`${pathToSettingsFolder}/${fileName}`, xml);
    });
  }));

  console.log('Process was finished');
};

const askQuestion = (nameStep) => {
  if (nameStep === 'whereCScalpFolder') {
    rl.question('Укажите полный путь к папке cscalp\n', userAnswer => {
      if (!userAnswer) {
        console.log('Вы ничего не ввели');
        return askQuestion('whereCScalpFolder');
      }

      if (!fs.existsSync(userAnswer)) {
        console.log('Не нашел папку');
        return askQuestion('whereCScalpFolder');
      }

      settings.pathToCscalpFolder = userAnswer;
      updateSettings();

      return start();
    });
  }

  if (nameStep === 'userName') {
    rl.question('Укажите ваш логин на сайте\n', async userAnswer => {
      if (!userAnswer) {
        console.log('Вы ничего не ввели');
        return askQuestion('userName');
      }

      const resultGetUser = await getUser({
        fullname: userAnswer,
      });

      if (!resultGetUser || !resultGetUser.status) {
        console.log(resultGetUser.message || 'Cant getUser');
        return start();
      }

      const resultUser = resultGetUser.result;

      if (!resultUser || !resultUser.status) {
        console.log(resultUser.message || 'Cant getUser');
        return start();
      }

      if (!resultUser.result) {
        console.log('Не нашел пользователя');
        return askQuestion('userName');
      }

      settings.userName = userAnswer;
      settings.userId = resultGetUser.result.result._id;
      updateSettings();

      return start();
    });
  }
};

start();
