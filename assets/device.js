(function () {
  "use strict";
  var statusLabels = Object.assign(Object.create(null), {Y: "Works", P: "Partial", N: "Broken"});
  var groups = [
    ["Core", [["Flashing", "Flashing"], ["USB Net", "USB Networking"], ["Storage", "Internal storage"]]],
    ["Multimedia", [["GPU", "3D Acceleration (GPU)"], ["Sound", "Audio"], ["Camera", "Camera"], ["Screen", "Display"], ["Touch", "Touchscreen"]]],
    ["Connectivity", [["Wifi", "Wi-Fi"], ["Bluetooth", "Bluetooth"], ["GPS", "GPS"], ["Baseband", "Baseband"]]],
    ["Miscellaneous", [["Battery", "Battery"], ["Light Control", "Light control"], ["App", "Applications"]]]
  ];
  function el(tag, text, className) {
    var node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function known(value) { return !!value && value !== "-"; }
  function metadata(value) {
    if (!known(value)) return "Not documented";
    return statusLabels[value] ? statusLabels[value] + " (support status)" : value;
  }
  function row(parent, label, value) {
    var tr = el("tr"), th = el("th", label), td = el("td");
    th.setAttribute("scope", "row");
    if (typeof value === "string") td.textContent = value;
    else td.appendChild(value);
    tr.append(th, td); parent.appendChild(tr);
    return td;
  }
  function heading(parent, text) {
    var tr = el("tr"), th = el("th", text, "group-heading");
    th.setAttribute("colspan", "2"); tr.appendChild(th); parent.appendChild(tr);
  }
  function appearance() {
    var preferences = {};
    try {
      var saved = JSON.parse(localStorage.getItem("device-wiki-appearance"));
      if (saved && typeof saved === "object" && !Array.isArray(saved)) preferences = saved;
    } catch (_) {}
    function bind(name, attr, allowed) {
      var value = allowed.indexOf(preferences[attr]) >= 0 ? preferences[attr] : "standard";
      document.body.dataset[attr] = value;
      document.querySelectorAll('input[name="' + name + '"]').forEach(function (input) {
        input.checked = input.value === value;
        input.addEventListener("change", function () {
          if (!input.checked) return;
          document.body.dataset[attr] = input.value;
          preferences[attr] = input.value;
          try { localStorage.setItem("device-wiki-appearance", JSON.stringify(preferences)); } catch (_) {}
        });
      });
    }
    bind("text-size", "text", ["small", "standard", "large"]);
    bind("page-width", "width", ["standard", "wide"]);
    document.querySelectorAll("[data-toggle]").forEach(function (button) {
      button.addEventListener("click", function () {
        var target = document.getElementById(button.dataset.toggle);
        target.hidden = !target.hidden;
        button.textContent = target.hidden ? "show" : "hide";
        button.setAttribute("aria-expanded", String(!target.hidden));
      });
    });
  }
  function render(device, devices) {
    document.title = device.Device + " — Device Wiki";
    document.getElementById("device-title").textContent = device.Device + " (" + device.Codename + ")";
    document.getElementById("spec-title").textContent = device.Device;
    document.getElementById("device-summary").textContent = "Device information and recorded feature support for " + device.Device + ".";
    document.getElementById("sample-notice").hidden = !device.Codename.startsWith("example-");
    var specs = document.getElementById("specs");
    row(specs, "Name", device.Device);
    row(specs, "Codename", device.Codename);
    row(specs, "Released", metadata(device["Release year"]));
    heading(specs, "Hardware");
    row(specs, "CPU", metadata(device.CPU));
    row(specs, "GPU", statusLabels[device.GPU] ? "See feature support" : metadata(device.GPU));
    row(specs, "Storage", metadata(device.Storage));
    row(specs, "Architecture", metadata(device.Architecture));
    heading(specs, "Software");
    row(specs, "Operating system", metadata(device.OS));
    var base = device["Based by"];
    var related = known(base) && devices.find(function (other) { return other.Codename === base || other.Device === base; });
    var baseValue = metadata(base);
    if (related) {
      baseValue = el("a", related.Device);
      baseValue.href = DeviceData.deviceUrl(related.Codename);
    }
    row(specs, "Based by", baseValue);
    if (known(base)) {
      var note = document.getElementById("base-note");
      note.textContent = 'The CSV lists "' + base + '" as the base for this device. Verify compatibility before following any related instructions.';
      note.hidden = false;
    }
    var features = document.getElementById("features");
    var issues = document.getElementById("issue-list");
    groups.forEach(function (group) {
      heading(features, group[0]);
      group[1].forEach(function (field) {
        var value = device[field[0]];
        var label = statusLabels[value] || "Untested";
        var td = row(features, field[1], label);
        td.className = statusLabels[value] ? "status-" + value : "status-unknown";
        if (!statusLabels[value]) td.title = "Support has not been recorded.";
        if (value === "P" || value === "N") issues.appendChild(el("li", field[1] + ": " + statusLabels[value].toLowerCase() + " support reported in the CSV."));
      });
    });
    if (!issues.children.length) issues.appendChild(el("li", "No partial or broken features are recorded. Untested features still need verification."));
    var categories = document.getElementById("categories");
    categories.appendChild(el("span", "Categories:"));
    var all = el("a", "Devices"); all.href = "devices.html"; categories.appendChild(all);
    if (known(device.OS)) {
      var osURL = "devices.html#" + encodeURIComponent(device.OS);
      var os = el("a", device.OS); os.href = osURL; categories.appendChild(os);
      var osLink = document.getElementById("os-link"); osLink.href = osURL;
      document.getElementById("os-related").hidden = false;
    }
    if (known(device.Architecture)) categories.appendChild(el("span", device.Architecture));
    document.getElementById("message").hidden = true;
    document.getElementById("wiki").hidden = false;
  }
  function message(title, text) {
    document.title = title + " — Device Wiki";
    var node = document.getElementById("message");
    node.replaceChildren(el("h1", title), el("p", text));
    var link = el("a", "Browse all devices"); link.href = "devices.html"; node.appendChild(link);
  }
  async function init() {
    appearance();
    var id = new URLSearchParams(location.search).get("id");
    if (!id) { message("Choose a device", "Open a device name from the support table to view its wiki page."); return; }
    try {
      var devices = await DeviceData.load();
      var device = devices.find(function (item) { return item.Codename === id; });
      if (!device) { message("Device not found", "This codename is not listed in devices.csv."); return; }
      render(device, devices);
    } catch (_) {
      message("Unable to load device", "Could not read devices.csv. Please try again and make sure the site is served over HTTP.");
    }
  }
  init();
})();
