import { ExtendableError } from "ts-error";
export class ExtendedError extends ExtendableError {
  constructor(message) {
    super(message);
  }

  errorMessage() {
    try {
      throw new ExtendedError("Error");
    } catch (e) {
      if (e instanceof ExtendedError) {
        console.log('err',e)
      } else {
        console.log("Somethings are going wrong")
      }
    }

  }
}
