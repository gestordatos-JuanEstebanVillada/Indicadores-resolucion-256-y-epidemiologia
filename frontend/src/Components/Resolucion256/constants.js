export { API_ORIGIN as API_URL } from "../../config/api";

export const months = [
  { id: 1, name: "ENERO" },
  { id: 2, name: "FEBRERO" },
  { id: 3, name: "MARZO" },
  { id: 4, name: "ABRIL" },
  { id: 5, name: "MAYO" },
  { id: 6, name: "JUNIO" },
  { id: 7, name: "JULIO" },
  { id: 8, name: "AGOSTO" },
  { id: 9, name: "SEPTIEMBRE" },
  { id: 10, name: "OCTUBRE" },
  { id: 11, name: "NOVIEMBRE" },
  { id: 12, name: "DICIEMBRE" },
];

export const createEmptyRows = () =>
  months.map((month) => ({
    month: month.id,
    numerador: 0,
    denominador: 0,
  }));
