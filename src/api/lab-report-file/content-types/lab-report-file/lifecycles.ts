import { removeStoredPdf } from "../../../../utils/lab-report-storage";

export default {
  async afterDelete(event: { result?: { storedFileName?: string } }) {
    await removeStoredPdf(event.result?.storedFileName);
  },
};
