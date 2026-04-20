export interface DeviceMapping {
  brand: string;
  model: string;
  vid: string;
  pid: string;
  cid: string;
  chipset_marketing?: string;
  mode: string;
  model_code?: string;
}

export const DEVICE_MAPPINGS: DeviceMapping[] = [
  // Samsung
  { brand: "Samsung", model: "Galaxy S26 Ultra", vid: "04e8", pid: "685d", cid: "SM8850", chipset_marketing: "Snapdragon 8 Elite Gen 5", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy S26+", vid: "04e8", pid: "685d", cid: "Exynos 2600", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy S26", vid: "04e8", pid: "685d", cid: "Exynos 2600", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy S25 Ultra", vid: "04e8", pid: "685d", cid: "SM8750", chipset_marketing: "Snapdragon 8 Elite", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy S25+", vid: "04e8", pid: "685d", cid: "Exynos 2500", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy S25", vid: "04e8", pid: "685d", cid: "Exynos 2500", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy S25 Edge", vid: "04e8", pid: "685d", cid: "SM8750", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy S24 Ultra", vid: "04e8", pid: "685d", cid: "SM8650", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy S23 Ultra", vid: "04e8", pid: "685d", cid: "SM8550", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy S22 Ultra", vid: "04e8", pid: "685d", cid: "SM8450", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy Z Fold 7", vid: "04e8", pid: "685d", cid: "SM8850", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy Z Flip 7", vid: "04e8", pid: "685d", cid: "SM8850", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy A56 5G", vid: "04e8", pid: "685d", cid: "Exynos 1580", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy A55 5G", vid: "04e8", pid: "685d", cid: "Exynos 1480", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy A36 5G", vid: "04e8", pid: "685d", cid: "SM6500", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy A16 5G", vid: "04e8", pid: "685d", cid: "MT6835", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy A16 4G", vid: "04e8", pid: "685d", cid: "MT6789", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy A05s", vid: "04e8", pid: "685d", cid: "SM6225", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy M54 5G", vid: "04e8", pid: "685d", cid: "Exynos 1380", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy F54 5G", vid: "04e8", pid: "685d", cid: "Exynos 1380", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy Tab S10 Ultra", vid: "04e8", pid: "685d", cid: "MT6989", mode: "Odin" },
  { brand: "Samsung", model: "Galaxy Tab A9+", vid: "04e8", pid: "685d", cid: "SM6375", mode: "Odin" },

  // Transsion Holdings
  { brand: "Infinix", model: "Note 40 Pro 5G", model_code: "X6851", vid: "0e8d", pid: "0003", cid: "MT6855", mode: "BROM" },
  { brand: "Infinix", model: "Note 30 5G", model_code: "X6711", vid: "0e8d", pid: "0003", cid: "MT6833", mode: "BROM" },
  { brand: "Infinix", model: "Hot 50 5G", model_code: "X6720", vid: "0e8d", pid: "0003", cid: "MT6833", mode: "BROM" },
  { brand: "Infinix", model: "Hot 40 Pro", model_code: "X6837", vid: "0e8d", pid: "0003", cid: "MT6789", mode: "BROM" },
  { brand: "Infinix", model: "Smart 8", model_code: "X6525", vid: "0e8d", pid: "0003", cid: "MT6765", mode: "BROM" },
  { brand: "Infinix", model: "Zero 30 5G", model_code: "X6731", vid: "0e8d", pid: "0003", cid: "MT6891", mode: "BROM" },
  { brand: "Tecno", model: "Phantom V Fold 2", model_code: "AE10", vid: "0e8d", pid: "0003", cid: "MT6983", mode: "BROM" },
  { brand: "Tecno", model: "Camon 30 Premier", model_code: "CL9", vid: "0e8d", pid: "0003", cid: "MT6896", mode: "BROM" },
  { brand: "Tecno", model: "Pova 6 Pro 5G", model_code: "LI9", vid: "0e8d", pid: "0003", cid: "MT6833", mode: "BROM" },
  { brand: "Tecno", model: "Spark 20 Pro+", model_code: "KJ7", vid: "0e8d", pid: "0003", cid: "MT6789", mode: "BROM" },
  { brand: "Tecno", model: "Pop 8", model_code: "BG6", vid: "1782", pid: "4d00", cid: "T606", mode: "FDL" },
  { brand: "Itel", model: "S25 Ultra", vid: "1782", pid: "4d00", cid: "T620", mode: "FDL" },
  { brand: "Itel", model: "P55 5G", model_code: "P661N", vid: "0e8d", pid: "0003", cid: "MT6833", mode: "BROM" },
  { brand: "Itel", model: "A90", vid: "1782", pid: "4d00", cid: "T7100", mode: "FDL" },
  { brand: "Itel", model: "Color Pro 5G", vid: "0e8d", pid: "0003", cid: "MT6835", mode: "BROM" },

  // Xiaomi / Redmi / Poco
  { brand: "Xiaomi", model: "15 Ultra", vid: "05c6", pid: "9008", cid: "SM8850", mode: "EDL" },
  { brand: "Xiaomi", model: "14 Pro", vid: "05c6", pid: "9008", cid: "SM8650", mode: "EDL" },
  { brand: "Redmi", model: "Note 15 Pro", vid: "0e8d", pid: "0003", cid: "MT6899", mode: "BROM" },
  { brand: "Redmi", model: "Note 14 Pro+ 5G", vid: "05c6", pid: "9008", cid: "SM7635", mode: "EDL" },
  { brand: "Redmi", model: "Note 13 4G", vid: "05c6", pid: "9008", cid: "SM6225", mode: "EDL" },
  { brand: "Poco", model: "F7 Ultra", vid: "05c6", pid: "9008", cid: "SM8750", mode: "EDL" },
  { brand: "Poco", model: "X8 Pro Max", vid: "0e8d", pid: "0003", cid: "MT6993", mode: "BROM" },
  { brand: "Poco", model: "M7 Pro 5G", vid: "0e8d", pid: "0003", cid: "MT6835", mode: "BROM" },
  { brand: "Poco", model: "C85", vid: "0e8d", pid: "0003", cid: "MT6835", mode: "BROM" },

  // Vivo / iQOO
  { brand: "Vivo", model: "X200 Pro", vid: "0e8d", pid: "0003", cid: "MT6989", mode: "BROM" },
  { brand: "Vivo", model: "V70 Elite", vid: "05c6", pid: "9008", cid: "SM8750", mode: "EDL" },
  { brand: "Vivo", model: "V50", vid: "05c6", pid: "9008", cid: "SM7550", mode: "EDL" },
  { brand: "Vivo", model: "Y200 5G", vid: "05c6", pid: "9008", cid: "SM4450", mode: "EDL" },
  { brand: "iQOO", model: "13", vid: "05c6", pid: "9008", cid: "SM8750", mode: "EDL" },
  { brand: "iQOO", model: "Neo10 Pro", vid: "0e8d", pid: "0003", cid: "MT6993", mode: "BROM" },

  // Apple
  { brand: "Apple", model: "iPhone 17 Pro Max", vid: "05ac", pid: "1227", cid: "A19", mode: "DFU" },
  { brand: "Apple", model: "iPhone 16 Pro", vid: "05ac", pid: "1227", cid: "A18", mode: "DFU" },
  { brand: "Apple", model: "iPhone 15", vid: "05ac", pid: "1227", cid: "A16", mode: "DFU" },
  { brand: "Apple", model: "iPhone 14 Plus", vid: "05ac", pid: "1227", cid: "A15", mode: "DFU" },
  { brand: "Apple", model: "iPhone SE (3rd Gen)", vid: "05ac", pid: "1227", cid: "A15", mode: "DFU" },
  { brand: "Apple", model: "iPad Pro 13-inch (M5)", vid: "05ac", pid: "1227", cid: "M5", mode: "DFU" },
  { brand: "Apple", model: "iPad mini (A17 Pro)", vid: "05ac", pid: "1227", cid: "A17", mode: "DFU" },

  // Feature Phones
  { brand: "Nokia", model: "110 (2019)", vid: "1782", pid: "4d00", cid: "SC6531E", mode: "FDL" },
  { brand: "Nokia", model: "215 4G (2024)", vid: "1782", pid: "4d00", cid: "UMS9117", mode: "FDL" },
  { brand: "Itel", model: "Super Guru 4G Max", vid: "1782", pid: "4d00", cid: "T127", mode: "FDL" },
  { brand: "Itel", model: "Muzik 450", vid: "0e8d", pid: "0003", cid: "MT6261", mode: "BROM" },
  { brand: "Itel", model: "it2163S", vid: "1782", pid: "4d00", cid: "SC6531", mode: "FDL" },
  { brand: "AGM", model: "M11", vid: "1782", pid: "4d00", cid: "UMS9117", mode: "FDL" },
  { brand: "Docomo", model: "SH-01L", vid: "05c6", pid: "9008", cid: "SM450", mode: "EDL" },
  { brand: "Lava", model: "A1 Benefit", vid: "1782", pid: "4d00", cid: "SC6531", mode: "FDL" }
];
