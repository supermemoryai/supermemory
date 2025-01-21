import { Result, Ok, Err } from "../errors/results";
import { BaseError } from "../errors/baseError";

export type contentType = "page" | "tweet" | "note" | "document" | "notion";

class GetTypeError extends BaseError {
  constructor(message?: string, source?: string) {
    super("[Decide Type Error]", message, source);
  }
}
export const typeDecider = (
  content: string
): Result<contentType, GetTypeError> => {
  try {
    // if the content is a URL, then it's a page. if its a URL with https://x.com/user/status/123, then it's a tweet.
    // if it ends with .pdf etc then it's a document. else, it's a note.
    // do strict checking with regex
    if (
      content.match(/https?:\/\/(x\.com|twitter\.com)\/[\w]+\/[\w]+\/[\d]+/)
    ) {
      return Ok("tweet");
    } else if (content.match(/\.(pdf|doc|docx|txt|rtf|odt|md)/i)) {
      return Ok("document"); 
    } else if (
      content.match(/https?:\/\/(www\.)?notion\.so\/.*/)
    ) {
      return Ok("notion");
    } else if (
      content.match(
        /^(https?:\/\/)?(www\.)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(\/.*)?$/i
      )
    ) {
      return Ok("page");
    } else {
      return Ok("note");
    }
  } catch (e) {
    console.error("[Decide Type Error]", e);
    return Err(new GetTypeError((e as Error).message, "typeDecider"));
  }
};
