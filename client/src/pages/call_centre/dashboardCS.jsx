import React from "react";
import NavbarCS from "../call_centre/NavbarCS";

export default function CC_Dashboard()
{
    return(
        <div>
            <NavbarCS/>
            <h1>
                This is the new dashboard for call centre. 
            </h1>

            <div className="space-y-4">
            {[1, 2, 3, 4,5,6,7,8,9,10].map((i) => (
              <div key={i} className="border border-gray-300 p-4 rounded bg-white shadow">
                <h3 className="font-semibold text-gray-800">Additional Content {i}</h3>
                <p className="text-gray-600">Scroll down to see the sticky navbar in action!</p>
              </div>
            ))}
            </div>
        </div>
    )
}


