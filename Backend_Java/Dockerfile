# Stage 1: Build the Maven application
FROM maven:3.8-eclipse-temurin-17 AS build
WORKDIR /app
# Copy the pom.xml and download project dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy the source code and compile
COPY src ./src
RUN mvn clean package -X -DskipTests

# Stage 2: Create a minimal runtime image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
# Copy the compiled .jar file from the 'build' stage
COPY --from=build /app/target/auth-0.0.1-SNAPSHOT.jar app.jar

# Expose the typical Spring Boot port
EXPOSE 8080

# Execute the application
ENTRYPOINT ["java", "-jar", "app.jar"]
