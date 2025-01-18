let cookieStr = "";
let tk = "";
let qq = "";
exports.setTk = (value) => {
  tk = value;
};
exports.setQQ = (value) => {
  qq = value;
};
exports.setCookies = (value) => {
  cookieStr = value;
};
exports.getTk = () => {
  return tk
};
exports.getQQ = () => {
  return qq
};
exports.getCookies = () => {
  return cookieStr
};
