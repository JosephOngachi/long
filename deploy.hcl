job "vacancy-service" {

  datacenters = ["*"]


  group "servers" {

  
    count = 1

    network {
     
      port "server" {
        static = 5010
      }
     
    }

    
    task "web" {
      driver = "docker"



      config {
        image   = "josephongachi/vacancy-app:v1.0.3"
        ports   = ["server"]
      }

      resources {
        cpu    = 800
        memory = 800
      }
    }
  }
}