FROM eclipse-temurin:21-jdk AS build
WORKDIR /build
COPY backend/ ./
RUN chmod +x mvnw && ./mvnw -B -ntp package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/target/signedchat-0.0.1-SNAPSHOT.jar app.jar
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65.0"
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
