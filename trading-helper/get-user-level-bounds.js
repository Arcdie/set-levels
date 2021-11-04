const axios = require('axios');

const getUserLevelBounds = async ({
  userName,
}) => {
  const responseGetData = await axios({
    method: 'get',
    url: `http://91.240.242.90/api/user-level-bounds?userName=${userName}&isWorked=false`,
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
