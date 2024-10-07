package routes

import (
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/syahlan1/wa_blast_gtr.git/controllers"

)

func RegisterRoutes(r *mux.Router) {
	// Middleware untuk menangani CORS
	corsMiddleware := handlers.CORS(
		handlers.AllowedOrigins([]string{"http://localhost:5173"}), // Ganti dengan domain frontend Anda
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}), // OPTIONS untuk preflight request
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}),
		handlers.AllowCredentials(), // Jika menggunakan credentials
	)

	// Apply the CORS middleware to the router
	r.Use(corsMiddleware)

	api := r.PathPrefix("/api").Subrouter()

	api.HandleFunc("/create-session", controllers.CreateSessionHandler).Methods("POST", "OPTIONS")
	api.HandleFunc("/send-blast", controllers.SendBlastHandler).Methods("POST", "OPTIONS")
	api.HandleFunc("/delete-session", controllers.DeleteSessionHandler).Methods("POST", "OPTIONS")

	api.HandleFunc("/get-devices", controllers.GetDevicesWithHistory).Methods("GET", "OPTIONS")

	api.HandleFunc("/upload-file", controllers.UploadFile).Methods("POST", "OPTIONS")

	// Route History Message
	api.HandleFunc("/history", controllers.GetHistory).Methods("GET", "OPTIONS")
	api.HandleFunc("/history/{id}", controllers.GetHistoryDetail).Methods("GET", "OPTIONS")
	api.HandleFunc("/history/{id}", controllers.DeleteHistory).Methods("DELETE", "OPTIONS")

	// Campaign
	api.HandleFunc("/get-campaign", controllers.GetAllCampaignsHandler).Methods("GET", "OPTIONS")
	api.HandleFunc("/get-campaign/{id}", controllers.GetCampaignDetailHandler).Methods("GET", "OPTIONS")
	api.HandleFunc("/create-campaign", controllers.CreateCampaignHandler).Methods("POST", "OPTIONS")
	api.HandleFunc("/update-campaign/{id}", controllers.UpdateCampaignHandler).Methods("PUT", "OPTIONS")
	api.HandleFunc("/send-campaign-blast", controllers.SendBlastCampaignHandler).Methods("POST", "OPTIONS")
	api.HandleFunc("/count-campaigns", controllers.CountCampaignsHandler).Methods("GET")
	api.HandleFunc("/delete-campaign/{id}", controllers.DeleteCampaignHandler).Methods("DELETE", "OPTIONS")

	api.HandleFunc("/get-available-contacts", controllers.GetAllContactsHandler).Methods("GET")

	api.HandleFunc("/user-register-route", controllers.RegisterHandler).Methods("POST", "OPTIONS")
    api.HandleFunc("/login", controllers.LoginHandler).Methods("POST", "OPTIONS")
    api.HandleFunc("/logout", controllers.LogoutHandler).Methods("POST", "OPTIONS")
	api.HandleFunc("/user-info", controllers.GetProfileHandler).Methods("GET", "OPTIONS")
	
	// api.HandleFunc("/forgot-password", controllers.ForgotPasswordHandler).Methods("POST", "OPTIONS")
	// api.HandleFunc("/reset-password", controllers.ResetPasswordHandler).Methods("POST", "OPTIONS")

}
