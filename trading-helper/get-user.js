const axios = require('axios');

const getUser = async ({
  fullname,
}) => {
  const responseGetData = await axios({
    method: 'get',
    url: `https://trading-helper.ru/api/users/public?fullname=${fullname}`,
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
  getUser,
};
