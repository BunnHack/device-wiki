/* Shared CSV parsing and device links for the support table and detail pages. */
var DeviceData = (function () {
  "use strict";
  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, "");
    var out = [], row = [], field = "", quoted = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else quoted = false;
        } else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { row.push(field.trim()); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field.trim()); field = "";
        if (row.some(function (v) { return v !== ""; })) out.push(row);
        row = [];
      } else field += c;
    }
    if (quoted) throw new Error("Unclosed CSV quote");
    row.push(field.trim());
    if (row.some(function (v) { return v !== ""; })) out.push(row);
    return out;
  }
  function deviceUrl(codename) {
    return "device.html?id=" + encodeURIComponent(codename);
  }
  async function load() {
    var response = await fetch("devices.csv", {cache: "no-store"});
    if (!response.ok) throw new Error("HTTP " + response.status);
    var all = parseCSV(await response.text());
    var headers = all.shift();
    if (!headers || headers.indexOf("Device") < 0 || headers.indexOf("Codename") < 0) {
      throw new Error("Missing device CSV headers");
    }
    return all.map(function (row) {
      if (row.length !== headers.length) throw new Error("Invalid device CSV row");
      return Object.fromEntries(headers.map(function (header, i) { return [header, row[i]]; }));
    });
  }
  return {parseCSV: parseCSV, deviceUrl: deviceUrl, load: load};
})();
