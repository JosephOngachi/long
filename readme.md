josephongachi
build:
	docker build . --no-cache -t josephongachi/vacancy-app:v1.0.3

push:
	docker push josephongachi/vacancy-app:v1.0.3
run:
	docker run -p 5002:5002 josephongachi/vacancy-app:v1.0.3














    