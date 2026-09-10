# Job Scout EU: A Job Search Helper

- Gathers details about open positions in European countries
- Filter your job according to job title, skills, freshness
- Integrated with resume oriented matching jobs
- Gives matching scores by keywords
- Displays role title, description, date, remote, visa details
- Job collection through various job sites

## Table of Content
- [Features](#features)
- [Architecture Diagram](#architecture-diagram)
- [Trade-offs](#trade-offs)
- [Microservices](#microservices)
- [Tech Stack](#-tech-stack)
- [Deploying Containers](#deploying-application-locally)

## Features
- Microservice architecture

## Architecture Diagram
<!-- </p>
<p align="center">
<a><img width="900" src="https://github.com/user-attachments/assets/9146c6f7-72e9-4f10-ab96-6874e8267fe9" alt="Architecture diagram of Pocketter project"/> </a>
</p> -->

## Trade-offs
- **Consistency vs Availability**  
  - Availability 99.99% & moderate Consistency
 
- **Fan-out Strategies**
  - Read-heavy architecture, where feed is fetched quickly from cache (Followers & Followees <1000/user)

## Microservices
1. Job Scout Frontend

## Deploying Application Locally

- Follow these steps to run the application via terminal.
  - Clone the backend repository  
    ```bash 
    git clone https://github.com/RohanAC09/InstaNotes.git
    cd InstaNotes/
    ```

  - Install relevant dependencies  
    ```bash
    npm install
    ```

  - Run the application  
    ```bash
    npm run dev
    ```

  - Killing the process (update value of port)
    ```bash
    npx kill-port {port}


## 🧩 Tech Stack

1. React
2. JavaScript
3. HTML
4. CSS
10. Kafka MQ
11. Spring-MVC
12. Spring-Security
