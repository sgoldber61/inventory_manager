echo "Removing existing image from local environment..."
docker image rm sgoldber61/inv-postgres --force
echo "Rebuilding image with updated dev database..."
docker build -t sgoldber61/inv-postgres -f Dockerfile-postgres .
echo ""

# To push to Docker hub, run:
# docker push sgoldber61/inv-postgres

