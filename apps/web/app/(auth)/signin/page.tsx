import { getThemeToggler } from "../../helpers/lib/get-theme-button";

async function Signin() {
  const SetThemeButton = getThemeToggler();
  return <SetThemeButton />;
}

export default Signin;
