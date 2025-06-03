// import { useEffect, useState } from "react";
// import { FaUserCircle } from "react-icons/fa";
// import "./custom-layout.scss";
// import authService from "../services/auth-service";
// import { useAppInitialized } from "../context/AppInitContext";

// interface CommonHeaderProps {
//   headerName: string;
// }

// const CommonHeader = ({ headerName }: CommonHeaderProps) => {
//   const { isReady } = useAppInitialized();
//   const [dropdownOpen, setDropdownOpen] = useState(false);
//   const [isSigningOut, setIsSigningOut] = useState(false);
//   const [username, setUsername] = useState<string | null>(null);

//   const toggleDropdown = () => {
//     setDropdownOpen(!dropdownOpen);
//   };

//   const handleSignOut = async () => {
//     try {
//       setIsSigningOut(true);
//       await authService.signOut();
//       window.location.href = '/s3-browser-login';
//     } catch (err: any) {
//       console.error(err.message || 'Failed to sign out');
//     } finally {
//       setIsSigningOut(false);
//     }
//   };

//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const user = await authService.getCurrentUser();
//         if (user) {
//           setUsername(user.username || user.signInDetails?.loginId || "User");
//         }
//       } catch (err) {
//         console.error("Failed to fetch current user:", err);
//       }
//     };

//     if (isReady) {
//       fetchUser();
//     }
//   }, [isReady]);

//   if (!isReady) {
//     return <div>Initializing Cognito...</div>;
//   }

//   return (
//     <header className="common-header">
//       <div className="header-left">
//         <h1 className="header-title">{headerName}</h1>
//       </div>
//       <div className="header-right">
//         {username && <span className="username-label">Hello, {username}</span>}
//         <div className="profile-icon" onClick={toggleDropdown}>
//           <FaUserCircle size={28} />
//         </div>
//         {dropdownOpen && (
//           <div className="profile-dropdown">
//             <ul>
//               <li onClick={handleSignOut}>
//                 {isSigningOut ? "Signing out..." : "Sign out"}
//               </li>
//             </ul>
//           </div>
//         )}
//       </div>
//     </header>
//   );
// };

// export default CommonHeader;



import { useEffect, useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import authService from "../services/auth-service";
import { useAppInitialized } from "../context/AppInitContext";

interface CommonHeaderProps {
  headerName: string;
}

const CommonHeader = ({ headerName }: CommonHeaderProps) => {
  const { isReady } = useAppInitialized();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await authService.signOut();
      window.location.href = '/s3-browser-login';
    } catch (err: any) {
      console.error(err.message || 'Failed to sign out');
    } finally {
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setUsername(user.username || user.signInDetails?.loginId || "User");
        }
      } catch (err) {
        console.error("Failed to fetch current user:", err);
      }
    };

    if (isReady) {
      fetchUser();
    }
  }, [isReady]);

  if (!isReady) {
    return <div className="text-sm text-gray-500">Initializing Cognito...</div>;
  }

  return (
    <header className="flex items-center justify-between w-full px-4 py-3 bg-white border-b border-gray-200">
      <div className="text-xl font-semibold text-gray-800">
        {headerName}
      </div>

      <div className="relative flex items-center space-x-3">
        {username && (
          <span className="text-sm text-gray-600">
            Hello, <span className="font-medium">{username}</span>
          </span>
        )}
        <div
          className="cursor-pointer text-gray-600 hover:text-gray-800"
          onClick={toggleDropdown}
        >
          <FaUserCircle size={28} />
        </div>

        {dropdownOpen && (
          <div className="absolute right-0 top-12 mt-2 w-32 bg-white border border-gray-200 rounded shadow-lg z-10">
            <ul>
              <li
                onClick={handleSignOut}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                {isSigningOut ? "Signing out..." : "Sign out"}
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

export default CommonHeader;
