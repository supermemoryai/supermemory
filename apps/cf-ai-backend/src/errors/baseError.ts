export class BaseHttpError extends Error {
    public status: number;
    public message: string;
  
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.message = message;
      Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
    }   
  }
  
  
  export class BaseError extends Error {
    type: string;
    message: string;
    source: string;
    ignoreLog: boolean;
  
    constructor(
      type: string,
      message?: string,
      source?: string,
      ignoreLog = false
    ) {
      super();
  
      Object.setPrototypeOf(this, new.target.prototype);
  
      this.type = type;
      this.message =
        message ??
        "An unknown error occurred. If this persists, please contact us.";
      this.source = source ?? "unspecified";
      this.ignoreLog = ignoreLog;
    }
  
    toJSON(): Record<PropertyKey, string> {
      return {
        type: this.type,
        message: this.message,
        source: this.source,
      };
    }
  }
  