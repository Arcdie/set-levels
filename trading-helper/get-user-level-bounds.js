const axios = require('axios');

const getUserLevelBounds = async ({
  userId,
}) => {
  const responseGetData = await axios({
    method: 'get',
    url: `https://trading-helper.ru/api/user-level-bounds?userId=${userId}&isWorked=false`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return {
    status: true,
    result: responseGetData.data,
  };
};

module.exports = {
  getUserLevelBounds,
};
