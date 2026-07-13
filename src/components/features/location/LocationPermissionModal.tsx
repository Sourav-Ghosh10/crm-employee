import React, { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import Modal from "../../common/Modal/Modal";
import Button from "../../common/Button/Button";

const LocationPermissionModal: React.FC = () => {
    const [status, setStatus] = useState<PermissionState | "default">("default");
    const [open, setOpen] = useState(false);

    useEffect(() => {
        // Check initial permission status
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: "geolocation" }).then((result) => {
                setStatus(result.state);
                if (result.state === "prompt" || result.state === "denied") {
                    setOpen(true);
                } else {
                    setOpen(false);
                }
                
                result.onchange = () => {
                    setStatus(result.state);
                    if (result.state === "granted") {
                        setOpen(false);
                    }
                };
            });
        }
    }, []);

    const handleEnable = () => {
        if (!("geolocation" in navigator)) {
            alert("Your browser does not support geolocation");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            () => {
                setStatus("granted");
                setOpen(false);
            },
            (error) => {
                // If the user denied the prompt
                if (error.code === error.PERMISSION_DENIED) {
                    setStatus("denied");
                    alert(
                        "Location access is blocked.\n\n" +
                        "To enable:\n" +
                        "1. Click the 🔒 lock icon near the address bar\n" +
                        "2. Set Location to 'Allow'\n" +
                        "3. Refresh the page"
                    );
                }
            }
        );
    };

    if (!open) return null;

    const isDenied = status === "denied";

    return (
        <Modal
            open={open}
            onClose={() => { }}
            title={isDenied ? "Location Blocked" : "Enable Location"}
            maxWidth="sm"
            isDismissible={false}
            actions={
                <Button
                    onClick={handleEnable}
                    variant="default"
                    className="w-full"
                >
                    {isDenied ? "Enable Location" : "Enable Location"}
                </Button>
            }
        >
            <div className="flex flex-col items-center text-center space-y-4 py-2">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <MapPin className="w-8 h-8" />
                </div>

                <div>
                    <p className="text-foreground font-medium mb-1">
                        {isDenied
                            ? "Location access is blocked"
                            : "Share your location"}
                    </p>

                    <p className="text-sm text-foreground-secondary">
                        {isDenied
                            ? "You have blocked location access for this site. Click the button above to re-enable it."
                            : "Enable location services to discover nearby events and personalized recommendations."
                        }
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default LocationPermissionModal;
