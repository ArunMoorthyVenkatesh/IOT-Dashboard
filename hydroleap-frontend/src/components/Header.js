import { useNavigate } from "react-router-dom";
import logo from "../assets/hydroleap-logo.png";
import "./Header.css";

const Header = () => {
  const navigate = useNavigate();

  return (
    <div className="header-root" onClick={() => navigate("/")}>
      <div className="header-circle">
        <img src={logo} alt="Logo" className="header-logo" />
      </div>
    </div>
  );
};

export default Header;
