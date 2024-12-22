<template>
  <v-container
    class="fill-height fill-width d-flex flex-column flex-nowrap"
    fluid
  >
    <v-row>
      <img
        src="../../public/Watch.png"
        alt="Watch logo"
        height="100px"
        width="100px"
    /></v-row>

    <v-row class="fill-height d-flex" min-width="100%">
      <v-col cols="12">
        <v-text-field 
          min-width="300"
          placeholder="Enter a YouTube URL & tap on enter"
          v-model="youtubeURL"
          @keypress.enter="loadURL"
        ></v-text-field>
        <v-row v-if="result">
          <v-col>
            <h2 class="teal-text">URL - {{ result }}</h2>
            <iframe
              width="560"
              height="315"
              :src="result"
              frameborder="0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      youtubeURL: "",
      result: "",
    };
  },
  methods: {
    loadURL() {
      // Check if URL starts with YouTube format
      if (!this.youtubeURL.startsWith("https://www.youtube.com/")) {
        console.warn("Please enter a valid YouTube URL");
        return;
      }

      const youtubeEmbedTemplate = "https://www.youtube.com/embed/";
      const urlParts = new URL(this.youtubeURL); // Use URL object to parse
      const videoID = urlParts.searchParams.get("v"); // Extract video ID from query param

      if (!videoID) {
        console.warn("Couldn't find video ID in the URL");
        return;
      }

      this.result = youtubeEmbedTemplate + videoID;
      this.youtubeURL = "";
    },
  },
};
</script>

<style></style>
