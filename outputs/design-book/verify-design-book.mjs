import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const file = await FileBlob.load(
  "C:/Users/ancuser14/Desktop/MENU/restaurant-app/outputs/design-book/QRTaste_Current_Project_Design.xlsx",
);
const wb = await SpreadsheetFile.importXlsx(file);
const sheets = await wb.inspect({ kind: "sheet", include: "id,name" });
const errors = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "xlsx final formula error scan",
});
console.log(sheets.ndjson);
console.log(errors.ndjson);
